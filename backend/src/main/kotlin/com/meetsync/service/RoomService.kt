package com.meetsync.service

import com.meetsync.dto.CreateRoomRequest
import com.meetsync.dto.RoomResponse
import com.meetsync.entity.Room
import com.meetsync.repository.RoomRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
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

    fun updateRoom(inviteToken: String, newName: String, requestingUserId: UUID): RoomResponse {
        val room = roomRepository.findByInviteToken(inviteToken)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")
        if (room.hostId != requestingUserId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host can update this room")
        room.name = newName
        return toResponse(roomRepository.save(room))
    }

    fun deleteRoom(inviteToken: String, requestingUserId: UUID) {
        val room = roomRepository.findByInviteToken(inviteToken)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")
        if (room.hostId != requestingUserId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host can delete this room")
        roomRepository.delete(room)
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
