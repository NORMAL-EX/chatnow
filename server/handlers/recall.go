package handlers

import (
	"fmt"
	"net/http"
	"time"

	"murmur/middleware"
	"murmur/models"

	"github.com/gin-gonic/gin"
)

// recallWindow is how long a normal member may recall their own message.
const recallWindow = 40 * time.Second

// RecallMessage recalls a channel message. Members may recall their own message
// within recallWindow; admins and super admins may recall anyone's at any time.
func (h *H) RecallMessage(c *gin.Context) {
	u := middleware.CurrentUser(c)
	id, ok := parseUintParam(c, "id")
	if !ok {
		fail(c, http.StatusBadRequest, "bad_id", "无效的消息 ID")
		return
	}
	var msg models.Message
	if err := h.DB.First(&msg, id).Error; err != nil {
		fail(c, http.StatusNotFound, "not_found", "消息不存在")
		return
	}
	if msg.Deleted || msg.Recalled {
		fail(c, http.StatusBadRequest, "gone", "消息已撤回或删除")
		return
	}
	if !u.IsPrivileged() {
		if msg.SenderID != u.ID || msg.IsBot {
			fail(c, http.StatusForbidden, "forbidden", "无权撤回该消息")
			return
		}
		if time.Since(msg.CreatedAt) > recallWindow {
			fail(c, http.StatusForbidden, "expired", "超过 40 秒,无法撤回")
			return
		}
	}
	now := time.Now()
	h.DB.Model(&msg).Updates(map[string]any{"recalled": true, "recalled_by": u.ID, "recalled_at": now})
	if msg.SenderID != u.ID {
		h.audit(u.ID, "message.recall", fmt.Sprintf("message:%d", id), "")
	}
	h.Hub.BroadcastMessageRecall(msg.ID, msg.ChannelID, u.ID)
	c.Status(http.StatusNoContent)
}

// RecallDM recalls a direct message with the same rules as RecallMessage.
func (h *H) RecallDM(c *gin.Context) {
	u := middleware.CurrentUser(c)
	id, ok := parseUintParam(c, "id")
	if !ok {
		fail(c, http.StatusBadRequest, "bad_id", "无效的消息 ID")
		return
	}
	var dm models.DirectMessage
	if err := h.DB.First(&dm, id).Error; err != nil {
		fail(c, http.StatusNotFound, "not_found", "消息不存在")
		return
	}
	if dm.Recalled {
		fail(c, http.StatusBadRequest, "gone", "消息已撤回")
		return
	}
	if !u.IsPrivileged() {
		if dm.SenderID != u.ID {
			fail(c, http.StatusForbidden, "forbidden", "无权撤回该消息")
			return
		}
		if time.Since(dm.CreatedAt) > recallWindow {
			fail(c, http.StatusForbidden, "expired", "超过 40 秒,无法撤回")
			return
		}
	}
	now := time.Now()
	h.DB.Model(&dm).Updates(map[string]any{"recalled": true, "recalled_by": u.ID, "recalled_at": now})
	if dm.SenderID != u.ID {
		h.audit(u.ID, "dm.recall", fmt.Sprintf("dm:%d", id), "")
	}
	h.Hub.BroadcastDMRecall(dm.SenderID, dm.ReceiverID, dm.ID, u.ID)
	c.Status(http.StatusNoContent)
}

// SuperGetMessage returns the original content of a (possibly recalled) channel
// message. Super-admin only — this is the "点击查看" reveal.
func (h *H) SuperGetMessage(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		fail(c, http.StatusBadRequest, "bad_id", "无效的消息 ID")
		return
	}
	var msg models.Message
	if err := h.DB.First(&msg, id).Error; err != nil {
		fail(c, http.StatusNotFound, "not_found", "消息不存在")
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": msg.ID, "content": msg.Content})
}

// SuperGetDM returns the original content of a (possibly recalled) direct
// message. Super-admin only.
func (h *H) SuperGetDM(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		fail(c, http.StatusBadRequest, "bad_id", "无效的消息 ID")
		return
	}
	var dm models.DirectMessage
	if err := h.DB.First(&dm, id).Error; err != nil {
		fail(c, http.StatusNotFound, "not_found", "消息不存在")
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": dm.ID, "content": dm.Content})
}
