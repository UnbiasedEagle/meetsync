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

    fun getRoomByInviteToken(inviteToken: String): RoomResponse =
        toResponse(findRoomOrThrow(inviteToken))

    fun getHostRooms(hostId: UUID): List<RoomResponse> =
        roomRepository.findAllByHostId(hostId).map { toResponse(it) }

    fun updateRoom(inviteToken: String, newName: String, requestingUserId: UUID): RoomResponse {
        val room = findRoomOrThrow(inviteToken)
        assertHost(room, requestingUserId)
        room.name = newName
        return toResponse(roomRepository.save(room))
    }

    fun deleteRoom(inviteToken: String, requestingUserId: UUID) {
        val room = findRoomOrThrow(inviteToken)
        assertHost(room, requestingUserId)
        roomRepository.delete(room)
    }

    /**
     * Returns the room so the caller can build the invite URL.
     * Throws 403 if the requester is not the room host.
     */
    fun assertInvitePermission(inviteToken: String, requestingUserId: UUID): RoomResponse {
        val room = findRoomOrThrow(inviteToken)
        assertHost(room, requestingUserId)
        return toResponse(room)
    }

    private fun findRoomOrThrow(inviteToken: String): Room =
        roomRepository.findByInviteToken(inviteToken)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")

    private fun assertHost(room: Room, userId: UUID) {
        if (room.hostId != userId)
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host can perform this action")
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
