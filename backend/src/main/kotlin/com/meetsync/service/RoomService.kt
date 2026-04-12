package com.meetsync.service

import com.meetsync.dto.CreateRoomRequest
import com.meetsync.dto.RoomResponse
import com.meetsync.entity.Room
import com.meetsync.repository.RoomRepository
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class RoomService(
    private val roomRepository: RoomRepository
) {

    fun createRoom(request: CreateRoomRequest, hostId: UUID): RoomResponse {
        val room = Room(
            name = request.name,
            hostId = hostId
        )
        val savedRoom = roomRepository.save(room)
        return toResponse(savedRoom)
    }

    fun getRoomByInviteToken(inviteToken: String): RoomResponse {
        val room = roomRepository.findByInviteToken(inviteToken)
            ?: throw IllegalArgumentException("Room not found")
        return toResponse(room)
    }

    fun getHostRooms(hostId: UUID): List<RoomResponse> {
        return roomRepository.findAllByHostId(hostId).map { toResponse(it) }
    }

    private fun toResponse(room: Room) = RoomResponse(
        id = room.id,
        name = room.name,
        hostId = room.hostId,
        inviteToken = room.inviteToken,
        active = room.active,
        createdAt = room.createdAt
    )
}
