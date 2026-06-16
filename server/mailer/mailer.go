// Package mailer sends transactional email over SMTP (STARTTLS or implicit TLS).
package mailer

import (
	"crypto/tls"
	"fmt"
	"mime"
	"net/smtp"
)

// Config holds SMTP connection details.
type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	FromName string
	SSL      bool // true => implicit TLS (e.g. port 465); false => plain/STARTTLS (587)
}

// Configured reports whether the minimum required fields are present.
func (c Config) Configured() bool {
	return c.Host != "" && c.Port != "" && c.From != ""
}

func (c Config) buildMessage(to, subject, body string) []byte {
	from := c.From
	if c.FromName != "" {
		from = fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", c.FromName), c.From)
	}
	msg := "From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + mime.QEncoding.Encode("utf-8", subject) + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" + body
	return []byte(msg)
}

// Send delivers a plain-text email.
func Send(c Config, to, subject, body string) error {
	if !c.Configured() {
		return fmt.Errorf("SMTP 未配置")
	}
	addr := c.Host + ":" + c.Port
	msg := c.buildMessage(to, subject, body)
	var auth smtp.Auth
	if c.Username != "" {
		auth = smtp.PlainAuth("", c.Username, c.Password, c.Host)
	}
	if c.SSL {
		return sendImplicitTLS(c, addr, auth, to, msg)
	}
	return smtp.SendMail(addr, auth, c.From, []string{to}, msg)
}

func sendImplicitTLS(c Config, addr string, auth smtp.Auth, to string, msg []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: c.Host})
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, c.Host)
	if err != nil {
		return err
	}
	defer client.Close()
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(c.From); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}
