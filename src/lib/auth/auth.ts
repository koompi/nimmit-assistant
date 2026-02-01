import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { loginSchema } from "@/lib/validations/user";
import { authConfig } from "./config";
import KIDProvider from "./kid-provider";
import type { User as NextAuthUser } from "next-auth";

/**
 * Full auth configuration with providers
 * Only used in Node.js environment (API routes, server components)
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  ...authConfig,
  providers: [
    // KID (KOOMPI ID) OAuth
    KIDProvider({
      clientId: process.env.KID_CLIENT_ID!,
      clientSecret: process.env.KID_CLIENT_SECRET!,
    }),
    // Credentials (Email/Password)
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        try {
          // Validate input
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) {
            return null;
          }

          const { email, password } = parsed.data;

          // Connect to database
          await connectDB();

          // Find user with password field
          const user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true,
          }).select("+passwordHash");

          if (!user) {
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }

          // Return user data for session
          return {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            name: `${user.profile.firstName} ${user.profile.lastName}`,
            avatar: user.profile.avatar,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "kid") {
        // Debug logging for KID provider
        console.log("KID signIn callback - user object:", JSON.stringify(user, null, 2));

        // Validate email exists before proceeding
        if (!user.email) {
          console.error("KID signIn error: email is missing from user object", { user, account });
          return false; // Deny sign-in if email is missing
        }

        try {
          await connectDB();
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Create user from KID profile
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const passwordHash = await bcrypt.hash(randomPassword, 10);

            const nameParts = user.name?.split(" ") || ["User", ""];
            const firstName = nameParts[0] || "User";
            const lastName = nameParts.slice(1).join(" ") || "Client";

            await User.create({
              email: user.email,
              passwordHash,
              role: "client", // Default to client for external sign-ups
              isActive: true,
              profile: {
                firstName,
                lastName,
                avatar: user.image || "",
              },
              clientProfile: {
                totalJobs: 0,
                totalSpent: 0,
                billing: {
                  credits: 0,
                  rolloverCredits: 0,
                },
              },
            });
            console.log(`Created new user from KID: ${user.email}`);
          }
        } catch (error) {
          console.error("Error syncing KID user:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign in
        if (account?.provider === "kid") {
          // For KID, we need to fetch the local database ID
          // because KID provider returns its own UUID
          try {
            await connectDB();
            const dbUser = await User.findOne({ email: user.email });
            if (dbUser) {
              token.id = dbUser._id.toString();
              token.role = dbUser.role;
              token.avatar = dbUser.profile.avatar;
            }
          } catch (error) {
            console.error("Error fetching local user for JWT:", error);
          }
        } else {
          // For credentials, user.id is already the db ID
          token.id = user.id;
          token.role = user.role;
          token.avatar = user.avatar;
        }
      }
      return token;
    },
  },
});
