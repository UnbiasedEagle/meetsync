package com.meetsync.security

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Date
import java.util.UUID

@Component
class JwtUtil {

    @Value("\${jwt.secret}")
    private lateinit var secret: String

    @Value("\${jwt.expiration}")
    private lateinit var expiration: String

    fun generateToken(userId: UUID, email: String): String {
        val key = Keys.hmacShaKeyFor(secret.toByteArray())
        return Jwts.builder()
            .subject(email)
            .claim("userId", userId.toString())
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + expiration.toLong()))
            .signWith(key)
            .compact()
    }

    fun extractEmail(token: String): String {
        val key = Keys.hmacShaKeyFor(secret.toByteArray())
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
            .subject
    }

    fun isTokenValid(token: String): Boolean {
        return try {
            val key = Keys.hmacShaKeyFor(secret.toByteArray())
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token)
            true
        } catch (e: Exception) {
            false
        }
    }
}
