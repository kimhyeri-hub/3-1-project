package com.yakssok.service;

import com.google.cloud.vision.v1.*;
import com.google.protobuf.ByteString;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OcrService {

    private final ImageAnnotatorClient visionClient;

    public OcrService(ImageAnnotatorClient visionClient) {
        this.visionClient = visionClient;
    }

    public String extractText(byte[] imageBytes) {
        ByteString imgBytes = ByteString.copyFrom(imageBytes);
        Image img = Image.newBuilder().setContent(imgBytes).build();
        Feature feat = Feature.newBuilder().setType(Feature.Type.DOCUMENT_TEXT_DETECTION).build();
        AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                .addFeatures(feat)
                .setImage(img)
                .build();

        BatchAnnotateImagesResponse response = visionClient.batchAnnotateImages(List.of(request));
        List<AnnotateImageResponse> responses = response.getResponsesList();

        if (responses.isEmpty()) {
            throw new RuntimeException("구글 비전 API 응답이 비어있습니다.");
        }

        AnnotateImageResponse res = responses.get(0);
        if (res.hasError()) {
            throw new RuntimeException("구글 비전 API 에러: " + res.getError().getMessage());
        }

        return res.getFullTextAnnotation().getText();
    }
}
