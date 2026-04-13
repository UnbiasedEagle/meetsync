package com.meetsync.controller

import com.meetsync.dto.SignalMessage
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Controller

@Controller
class SignalingController(private val messagingTemplate: SimpMessagingTemplate) {

    @MessageMapping("/signal")
    fun handleSignal(message: SignalMessage) {
        messagingTemplate.convertAndSend("/topic/room/${message.roomId}", message)
    }
}
