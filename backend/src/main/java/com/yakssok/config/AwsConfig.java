package com.yakssok.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class AwsConfig {

    @Value("${aws.region.dynamodb:ap-northeast-2}")
    private String dynamoDbRegion;

    @Value("${aws.region.bedrock:us-east-1}")
    private String bedrockRegion;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder().region(Region.of(dynamoDbRegion)).build();
    }

    @Bean
    public BedrockRuntimeClient bedrockRuntimeClient() {
        return BedrockRuntimeClient.builder().region(Region.of(bedrockRegion)).build();
    }

    @Bean
    public DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder().region(Region.of(dynamoDbRegion)).build();
    }
}
