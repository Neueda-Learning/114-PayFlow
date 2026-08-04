package com.payflow.security;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Simple AES-256-GCM helper used to encrypt/decrypt sensitive fields at rest
 * (e.g. bank account numbers, IFSC codes) before they are persisted to the database.
 *
 * The encryption key is derived (via SHA-256) from the ENCRYPTION_SECRET_KEY
 * environment variable so that any length/format of secret can be supplied.
 * A default key is used if the environment variable is not set, to keep local
 * development simple — set ENCRYPTION_SECRET_KEY in production environments.
 */
public final class AesEncryptionUtil {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final String DEFAULT_SECRET =
            "flowpay-default-encryption-secret-change-in-prod";

    private AesEncryptionUtil() {
    }

    private static SecretKeySpec deriveKey() {
        try {
            String secret = System.getenv("ENCRYPTION_SECRET_KEY");
            if (secret == null || secret.isBlank()) {
                secret = DEFAULT_SECRET;
            }
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(secret.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive encryption key", e);
        }
    }

    /** Encrypts plaintext and returns a Base64 string (IV + ciphertext). Returns null for null input. */
    public static String encrypt(String plainText) {
        if (plainText == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, deriveKey(), new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    /**
     * Decrypts a Base64 (IV + ciphertext) string produced by {@link #encrypt}.
     * Returns the input unchanged for null/blank values \u2014 this also gracefully
     * handles legacy rows persisted before encryption was introduced, which
     * stored plain empty strings rather than encrypted ciphertext.
     */
    public static String decrypt(String encoded) {
        if (encoded == null || encoded.isEmpty()) {
            return encoded;
        }
        try {
            byte[] combined = Base64.getDecoder().decode(encoded);
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, deriveKey(), new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }
}
