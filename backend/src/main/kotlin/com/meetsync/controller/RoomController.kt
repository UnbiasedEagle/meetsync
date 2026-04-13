package com.meetsync.controller

import com.meetsync.dto.CreateRoomRequest
import com.meetsync.dto.InviteRequest
import com.meetsync.dto.RoomResponse
import com.meetsync.dto.UpdateRoomRequest
import com.meetsync.repository.UserRepository
import com.meetsync.service.EmailService
import com.meetsync.service.RoomService
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/rooms")
class RoomController(
    private val roomService: RoomService,
    private val userRepository: UserRepository,
    private val emailService: EmailService,
    @Value("\${app.frontend-url}") private val frontendUrl: String
) {

    @PostMapping
    fun createRoom(
        @RequestBody request: CreateRoomRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<RoomResponse> {
        val user = resolveUser(userDetails)
        val room = roomService.createRoom(request, user.id!!)
        return ResponseEntity.status(201).body(room)
    }

    @GetMapping("/me")
    fun getMyRooms(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<List<RoomResponse>> {
        val user = resolveUser(userDetails)
        return ResponseEntity.ok(roomService.getHostRooms(user.id!!))
    }

    @GetMapping("/{inviteToken}")
    fun getRoomByInviteToken(@PathVariable inviteToken: String): ResponseEntity<RoomResponse> {
        val room = roomService.getRoomByInviteToken(inviteToken)
        return ResponseEntity.ok(room)
    }

    @PutMapping("/{inviteToken}")
    fun updateRoom(
        @PathVariable inviteToken: String,
        @RequestBody request: UpdateRoomRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<RoomResponse> {
        val user = resolveUser(userDetails)
        return ResponseEntity.ok(roomService.updateRoom(inviteToken, request.name, user.id!!))
    }

    @DeleteMapping("/{inviteToken}")
    fun deleteRoom(
        @PathVariable inviteToken: String,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Void> {
        val user = resolveUser(userDetails)
        roomService.deleteRoom(inviteToken, user.id!!)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{inviteToken}/invite")
    fun inviteToRoom(
        @PathVariable inviteToken: String,
        @RequestBody request: InviteRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<Void> {
        val room = roomService.getRoomByInviteToken(inviteToken)
        val joinUrl = "$frontendUrl/room/${room.inviteToken}"
        emailService.sendInvite(request.email, room.name, joinUrl)
        return ResponseEntity.ok().build()
    }

    private fun resolveUser(userDetails: UserDetails) =
        userRepository.findByEmail(userDetails.username)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
}
