package com.example.pasteapi.exception;

public class PasteExpiredException extends RuntimeException {
    public PasteExpiredException(String msg) { super(msg); }
}

