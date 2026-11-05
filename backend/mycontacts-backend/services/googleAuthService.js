const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const verifyGoogleToken = async (idToken) => {
    if (!idToken) {
        throw new Error("Google ID token is required");
    }

    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error("Invalid Google token");
    }

    return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        email_verified: payload.email_verified
    };
};

module.exports = {
    verifyGoogleToken
};
