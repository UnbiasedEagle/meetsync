package com.meetsync.dto

data class SignalMessage(
    val type: String,
    val from: String,
    val to: String? = null,
    val roomId: String,
    val payload: String
)
