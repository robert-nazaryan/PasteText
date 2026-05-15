package com.example.pasteapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PasteApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(PasteApiApplication.class, args);
    }

}
