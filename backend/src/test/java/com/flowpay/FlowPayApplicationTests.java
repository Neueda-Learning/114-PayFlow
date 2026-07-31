package com.flowpay;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class FlowPayApplicationTests {

    @Test
    void contextLoads() {
        // Verifies the Spring context starts up without errors
    }
}
