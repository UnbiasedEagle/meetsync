package com.meetsync.controller

import com.meetsync.dto.CreateRoomRequest
import com.meetsync.dto.RoomResponse
import com.meetsync.service.RoomService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import com.meetsync.repository.UserRepository
import org.springframework.web.bind.annotation.RequestBody

@RestController
@RequestMapping("/api/rooms")
class RoomController(
    private val roomService: RoomService,
    private val userRepository: UserRepository
) {

    @PostMapping
    fun createRoom(
        @RequestBody request: CreateRoomRequest,
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<RoomResponse> {
        val user = userRepository.findByEmail(userDetails.username)
            ?: return ResponseEntity.notFound().build()
        val room = roomService.createRoom(request, user.id!!)
        return ResponseEntity.status(201).body(room)
    }

    @GetMapping("/me")
    fun getMyRooms(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<List<RoomResponse>> {
        val user = userRepository.findByEmail(userDetails.username)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(roomService.getHostRooms(user.id!!))
    }

    @GetMapping("/{inviteToken}")
    fun getRoomByInviteToken(@PathVariable inviteToken: String): ResponseEntity<RoomResponse> {
        val room = roomService.getRoomByInviteToken(inviteToken)
        return ResponseEntity.ok(room)
    }
}
