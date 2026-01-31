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
    email: string;
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
                scope: "profile.basic",
            },
        },

        token: "https://oauth.koompi.org/v2/oauth/token",
        userinfo: "https://oauth.koompi.org/v2/oauth/userinfo",

        // KOOMPI API wraps user data: { user: { _id, fullname, email, ... }, status: "success" }
        profile(profile) {
            // Handle both wrapped and unwrapped responses
            const user = (profile as { user?: KIDProfile }).user || profile;
            return {
                id: user._id,
                name: user.fullname,
                email: user.email,
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
