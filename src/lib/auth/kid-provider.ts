/**
 * KID (KOOMPI ID) OAuth Provider for NextAuth
 * Based on: https://dash.koompi.org/llms.txt
 * 
 * Uses client_secret_post authentication method as required by KID API
 */

import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface KIDProfile {
    _id: string;
    fullname: string;
    email?: string;
    username?: string;
    wallet_address?: string;
}

/**
 * KID OAuth Provider
 * 
 * KID API requires credentials in the request body (client_secret_post),
 * not Basic Auth header which is NextAuth's default.
 */
export default function KIDProvider<P extends KIDProfile>(
    options: OAuthUserConfig<P>
): OAuthConfig<P> {
    return {
        id: "kid",
        name: "KOOMPI ID",
        type: "oauth",

        // Client credentials authentication method
        // "client_secret_post" sends credentials in body, not Basic Auth header
        client: {
            token_endpoint_auth_method: "client_secret_post",
        },

        authorization: {
            url: "https://oauth.koompi.org/v2/oauth",
            params: {
                scope: "profile.basic profile.contact",
            },
        },

        token: "https://oauth.koompi.org/v2/oauth/token",
        userinfo: "https://oauth.koompi.org/v2/oauth/userinfo",

        // KOOMPI API wraps user data: { user: { _id, fullname, email, ... }, status: "success" }
        profile(profile) {
            // Debug logging for KID profile response
            console.log("KID profile callback - raw response:", JSON.stringify(profile, null, 2));

            // Handle both wrapped and unwrapped responses
            const user = (profile as { user?: KIDProfile }).user || profile;

            // Log the extracted user object
            console.log("KID profile callback - extracted user:", JSON.stringify(user, null, 2));

            // Use email if available, otherwise fallback to username@koompi.id
            // This handles cases where profile.contact scope is not granted
            let email = user.email || (user.username ? `${user.username}@koompi.id` : null);

            if (!email) {
                // Last resort: use KID user ID as email prefix
                email = `${user._id}@koompi.id`;
                console.warn(`KID profile: no email or username, using ID-based email: ${email}`);
            } else if (!user.email) {
                console.log(`KID profile: using fallback email ${email} (no profile.contact scope granted)`);
            }

            return {
                id: user._id,
                name: user.fullname,
                email: email,
                image: null,
                role: "client" as const,
                walletAddress: user.wallet_address,
            };
        },

        style: {
            brandColor: "#2563eb",
            logo: "https://koompi.org/favicon.ico",
        },

        options,
    };
}
