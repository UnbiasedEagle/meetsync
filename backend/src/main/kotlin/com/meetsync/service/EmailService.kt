package com.meetsync.service

import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

@Service
class EmailService(private val mailSender: JavaMailSender) {

    fun sendInvite(to: String, roomName: String, joinUrl: String) {
        val message = mailSender.createMimeMessage()
        val helper = MimeMessageHelper(message, true)

        helper.setTo(to)
        helper.setSubject("You're invited to join $roomName")
        helper.setText(
            """
              <p>You've been invited to join <strong>$roomName</strong>.</p>
              <p><a href="$joinUrl">Click here to join the room</a></p>
              <p>Or copy this link: $joinUrl</p>
              """.trimIndent(),
            true
        )

        mailSender.send(message)
    }
}
