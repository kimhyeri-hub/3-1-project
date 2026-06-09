package com.yakssok.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@Service
public class S3Service {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket:sgu-yaksok-1-s3}")
    private String bucket;

    public S3Service(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String upload(byte[] imageBytes, String originalFilename, String contentType) {
        String key = "uploads/" + UUID.randomUUID() + "-" + originalFilename;
        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType != null ? contentType : "image/jpeg")
                        .build(),
                RequestBody.fromBytes(imageBytes)
        );
        return key;
    }
}
