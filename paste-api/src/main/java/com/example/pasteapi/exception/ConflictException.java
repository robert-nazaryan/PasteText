package com.example.pasteapi.exception;

public class ConflictException extends RuntimeException {
    public ConflictException(String msg) { super(msg); }
}
