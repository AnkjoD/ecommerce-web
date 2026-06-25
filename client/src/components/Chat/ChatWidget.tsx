import { useState, useRef, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User as UserIcon, Loader2, ShoppingBag } from 'lucide-react'
import chatApi, { type ChatMessage, type ChatResponse } from '~/apis/chat.api'
import { AppContext } from '~/contexts/app.context'
import { formatCurrency } from '~/utils/formatCurrency'
import { useTheme } from '@mui/material/styles'
import { alpha } from '@mui/material'

export default function ChatWidget() {
  const { isAuthenticated } = useContext(AppContext)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const primary = theme.palette.primary.main        // #6C5CE7
  const primaryLight = theme.palette.primary.light  // #8275E9
  const paperBg = theme.palette.background.paper
  const defaultBg = theme.palette.background.default
  const textPrimary = theme.palette.text.primary
  const textSecondary = theme.palette.text.secondary

  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<(ChatMessage & { products?: any[] })[]>([
    {
      role: 'assistant',
      content: '👋 Xin chào! Mình là AI tư vấn của Homura Shop. Mình có thể giúp bạn tìm kiếm sản phẩm, kiểm tra giá, hoặc tư vấn theo sở thích. Bạn cần mình giúp gì ạ?',
    }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, isOpen])

  if (!isAuthenticated) return null

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!message.trim() || isLoading) return

    const userMsg = message.trim()
    setMessage('')
    
    const updatedHistory: (ChatMessage & { products?: any[] })[] = [
      ...chatHistory,
      { role: 'user', content: userMsg }
    ]
    setChatHistory(updatedHistory)
    setIsLoading(true)

    try {
      const res = await chatApi.chatCompletion(userMsg, updatedHistory.map(m => ({ role: m.role, content: m.content })))
      const aiResponse = res.data.data as ChatResponse

      setChatHistory(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: aiResponse.response || 'Xin lỗi, mình không có câu trả lời cho câu hỏi này.', 
          products: aiResponse.products 
        }
      ])
    } catch (error: any) {
      // Log chi tiết để debug
      console.error('[ChatWidget] ERROR:', error)
      console.error('[ChatWidget] status:', error?.response?.status)
      console.error('[ChatWidget] data:', JSON.stringify(error?.response?.data))
      console.error('[ChatWidget] message:', error?.message)
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: 'Hệ thống AI hiện đang bận hoặc quá tải. Vui lòng thử lại sau nhé! 😢' }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Gradient header dùng primary của MUI theme
  const headerGradient = `linear-gradient(135deg, ${primary} 0%, ${primaryLight} 100%)`
  const userBubbleGradient = `linear-gradient(135deg, ${primary} 0%, ${primaryLight} 100%)`
  const botAvatarGradient = `linear-gradient(135deg, ${primary} 0%, ${primaryLight} 100%)`

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 1300,
              padding: '16px',
              background: headerGradient,
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: `0 8px 32px ${alpha(primary, 0.45)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'box-shadow 0.3s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 40px ${alpha(primary, 0.65)}`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${alpha(primary, 0.45)}`
            }}
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 1300,
              width: '380px',
              height: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              background: isDark ? alpha(paperBg, 0.92) : alpha(paperBg, 0.97),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? alpha('#FFFFFF', 0.08) : alpha(primary, 0.12)}`,
              borderRadius: '20px',
              boxShadow: isDark
                ? `0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px ${alpha(primary, 0.15)}`
                : `0 20px 60px ${alpha(primary, 0.15)}, 0 0 0 1px ${alpha(primary, 0.06)}`,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: headerGradient,
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                }}>
                  <Bot size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>Homura AI Assistant</h3>
                  <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Luôn sẵn sàng hỗ trợ</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: isDark ? alpha(defaultBg, 0.6) : alpha('#F8F8FA', 0.7),
            }}>
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    maxWidth: '85%',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}>
                    {/* Avatar */}
                    <div style={{ flexShrink: 0, marginTop: '4px' }}>
                      {msg.role === 'user' ? (
                        <div style={{
                          width: '32px', height: '32px',
                          background: isDark ? alpha('#FFFFFF', 0.1) : alpha(primary, 0.1),
                          color: isDark ? textSecondary : primary,
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <UserIcon size={16} />
                        </div>
                      ) : (
                        <div style={{
                          width: '32px', height: '32px',
                          background: botAvatarGradient,
                          color: '#fff',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Bot size={16} />
                        </div>
                      )}
                    </div>

                    {/* Bubble */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          ...(msg.role === 'user'
                            ? {
                                background: userBubbleGradient,
                                color: '#fff',
                                boxShadow: `0 4px 16px ${alpha(primary, 0.3)}`,
                              }
                            : {
                                background: isDark ? alpha('#FFFFFF', 0.07) : '#FFFFFF',
                                color: textPrimary,
                                border: `1px solid ${isDark ? alpha('#FFFFFF', 0.08) : alpha(primary, 0.1)}`,
                                boxShadow: `0 2px 8px ${isDark ? 'rgba(0,0,0,0.3)' : alpha(primary, 0.06)}`,
                              })
                        }}
                        dangerouslySetInnerHTML={{
                          __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>')
                        }}
                      />

                      {/* Product cards */}
                      {msg.products && msg.products.length > 0 && (
                        <div style={{
                          display: 'flex', gap: '8px', overflowX: 'auto',
                          paddingBottom: '8px', marginTop: '4px',
                        }}>
                          {msg.products.map((p, i) => {
                            const price = p.price || p.min_price || 0
                            return (
                              <a
                                key={i}
                                href={`/product/${p.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  flexShrink: 0,
                                  width: '140px',
                                  background: isDark ? alpha('#FFFFFF', 0.05) : '#FFFFFF',
                                  border: `1px solid ${isDark ? alpha('#FFFFFF', 0.08) : alpha(primary, 0.15)}`,
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  textDecoration: 'none',
                                  display: 'block',
                                  transition: 'border-color 0.2s, box-shadow 0.2s',
                                }}
                                onMouseEnter={e => {
                                  const el = e.currentTarget as HTMLAnchorElement
                                  el.style.borderColor = primary
                                  el.style.boxShadow = `0 4px 16px ${alpha(primary, 0.2)}`
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget as HTMLAnchorElement
                                  el.style.borderColor = isDark ? alpha('#FFFFFF', 0.08) : alpha(primary, 0.15)
                                  el.style.boxShadow = 'none'
                                }}
                              >
                                <div style={{ height: '96px', background: isDark ? alpha('#FFFFFF', 0.04) : '#F8F8FA', position: 'relative' }}>
                                  {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: textSecondary }}>
                                      <ShoppingBag size={24} />
                                    </div>
                                  )}
                                </div>
                                <div style={{ padding: '8px' }}>
                                  <h4 style={{
                                    margin: '0 0 4px 0',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: textPrimary,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}>{p.name}</h4>
                                  <p style={{ margin: 0, color: primary, fontWeight: 700, fontSize: '12px' }}>
                                    ₫{formatCurrency(price)}
                                  </p>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '8px', maxWidth: '85%' }}>
                    <div style={{
                      flexShrink: 0, width: '32px', height: '32px',
                      background: botAvatarGradient, color: '#fff',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: '4px',
                    }}>
                      <Bot size={16} />
                    </div>
                    <div style={{
                      padding: '14px 18px',
                      background: isDark ? alpha('#FFFFFF', 0.07) : '#FFFFFF',
                      border: `1px solid ${isDark ? alpha('#FFFFFF', 0.08) : alpha(primary, 0.1)}`,
                      borderRadius: '18px 18px 18px 4px',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      color: primary,
                    }}>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Đang suy nghĩ...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px',
                background: isDark ? alpha(paperBg, 0.95) : paperBg,
                borderTop: `1px solid ${isDark ? alpha('#FFFFFF', 0.06) : alpha(primary, 0.08)}`,
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Hỏi Homura AI bất cứ điều gì..."
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    paddingLeft: '16px',
                    paddingRight: '52px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    background: isDark ? alpha('#FFFFFF', 0.06) : alpha(primary, 0.04),
                    border: `1px solid ${isDark ? alpha('#FFFFFF', 0.1) : alpha(primary, 0.15)}`,
                    borderRadius: '999px',
                    fontSize: '14px',
                    color: textPrimary,
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = primary
                    e.target.style.boxShadow = `0 0 0 3px ${alpha(primary, 0.12)}`
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = isDark ? alpha('#FFFFFF', 0.1) : alpha(primary, 0.15)
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!message.trim() || isLoading}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    padding: '8px',
                    background: message.trim() && !isLoading ? headerGradient : (isDark ? alpha('#FFFFFF', 0.1) : '#E0E0E0'),
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: message.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: message.trim() && !isLoading ? `0 4px 12px ${alpha(primary, 0.4)}` : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={16} style={{ marginLeft: '2px' }} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframe for spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
