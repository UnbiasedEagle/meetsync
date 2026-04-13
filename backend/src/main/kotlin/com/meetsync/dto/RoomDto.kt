package com.meetsync.dto

import java.time.Instant
import java.util.UUID

data class CreateRoomRequest(
    val name: String
)

data class InviteRequest(
    val email: String
)


data class RoomResponse(
    val id: UUID?,
    val name: String,
    val hostId: UUID,
    val inviteToken: String,
    val active: Boolean,
    val createdAt: Instant
)
