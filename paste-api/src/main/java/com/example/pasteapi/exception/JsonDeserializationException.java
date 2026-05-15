package com.example.pasteapi.exception;

public class JsonDeserializationException extends RuntimeException {
    public JsonDeserializationException(String msg) { super(msg); }
}
