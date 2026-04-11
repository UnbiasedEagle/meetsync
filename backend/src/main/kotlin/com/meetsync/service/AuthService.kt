package com.meetsync.service

import com.meetsync.dto.AuthResponse
import com.meetsync.dto.LoginRequest
import com.meetsync.dto.RegisterRequest
import com.meetsync.entity.User
import com.meetsync.repository.UserRepository
import com.meetsync.security.JwtUtil
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtUtil: JwtUtil
) {

    fun register(request: RegisterRequest): AuthResponse {
        if (userRepository.findByEmail(request.email) != null) {
            throw IllegalArgumentException("Email already in use")
        }

        val user = User(
            name = request.name,
            email = request.email,
            password = passwordEncoder.encode(request.password)
        )

        val savedUser = userRepository.save(user)
        val token = jwtUtil.generateToken(savedUser.id!!, savedUser.email)

        return AuthResponse(
            token = token,
            id = savedUser.id,
            name = savedUser.name,
            email = savedUser.email
        )
    }

    fun login(request: LoginRequest): AuthResponse {
        val user = userRepository.findByEmail(request.email)
            ?: throw IllegalArgumentException("Invalid email or password")

        if (!passwordEncoder.matches(request.password, user.password)) {
            throw IllegalArgumentException("Invalid email or password")
        }

        val token = jwtUtil.generateToken(user.id!!, user.email)

        return AuthResponse(
            token = token,
            id = user.id,
            name = user.name,
            email = user.email
        )
    }
}
