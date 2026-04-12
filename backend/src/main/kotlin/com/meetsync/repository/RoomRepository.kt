package com.meetsync.repository

import com.meetsync.entity.Room
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface RoomRepository : JpaRepository<Room, UUID> {
    fun findByInviteToken(inviteToken: String): Room?
    fun findAllByHostId(hostId: UUID): List<Room>
}
