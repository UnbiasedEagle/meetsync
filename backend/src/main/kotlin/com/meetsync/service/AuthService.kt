package com.meetsync.service

import com.meetsync.dto.AuthResponse
import com.meetsync.dto.LoginRequest
import com.meetsync.dto.RegisterRequest
import com.meetsync.entity.User
import com.meetsync.repository.UserRepository
import com.meetsync.security.JwtUtil
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtUtil: JwtUtil
) {

    fun register(request: RegisterRequest): AuthResponse {
        if (userRepository.findByEmail(request.email) != null) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Email already in use")
        }
        val user = userRepository.save(
            User(
                name = request.name,
                email = request.email,
                password = passwordEncoder.encode(request.password)
            )
        )
        return buildAuthResponse(user)
    }

    fun login(request: LoginRequest): AuthResponse {
        val user = userRepository.findByEmail(request.email)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password")
        if (!passwordEncoder.matches(request.password, user.password)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password")
        }
        return buildAuthResponse(user)
    }

    private fun buildAuthResponse(user: User): AuthResponse {
        val token = jwtUtil.generateToken(user.id!!, user.email)
        return AuthResponse(token = token, id = user.id, name = user.name, email = user.email)
    }
}
