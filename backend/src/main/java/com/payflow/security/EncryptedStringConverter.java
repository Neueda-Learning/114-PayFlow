package com.payflow.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter that transparently encrypts a String field before it is written
 * to the database and decrypts it when the entity is loaded, using AES-256-GCM.
 *
 * Apply with: @Convert(converter = EncryptedStringConverter.class)
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return AesEncryptionUtil.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return AesEncryptionUtil.decrypt(dbData);
    }
}
