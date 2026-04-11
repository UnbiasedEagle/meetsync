package com.meetsync.dto

import java.util.UUID

data class AuthResponse(
    val token: String,
    val id: UUID?,
    val name: String,
    val email: String
)
