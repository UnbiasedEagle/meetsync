package com.meetsync.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "rooms")
class Room(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    val hostId: UUID,

    @Column(nullable = false, unique = true)
    val inviteToken: String = UUID.randomUUID().toString(),

    @Column(nullable = false)
    val active: Boolean = true,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
