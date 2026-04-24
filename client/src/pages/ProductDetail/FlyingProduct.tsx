import React, { useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { AppContext } from '~/contexts/app.context'

interface Props {
  image: string
  startPos: { x: number; y: number; width: number; height: number } | null
  endPos: { x: number; y: number } | null
  onComplete: () => void
}

const FlyingProduct = ({ image, startPos, endPos, onComplete }: Props) => {
  const { triggerCartBump, refreshCart } = useContext(AppContext)

  if (!startPos || !endPos) return null

  const deltaX = endPos.x - startPos.x
  const deltaY = endPos.y - startPos.y

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ 
            position: 'fixed',
            top: startPos.y,
            left: startPos.x,
            width: startPos.width,
            height: startPos.height,
            zIndex: 9999,
            opacity: 1,
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.8)',
            transformOrigin: 'center center',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden'
        }}
        animate={{ 
            x: [0, deltaX * 0.4, deltaX - startPos.width / 2], 
            y: [0, deltaY * 0.2 - 200, deltaY - startPos.height / 2], 
            scale: [1, 0.4, 0.05], 
            opacity: [1, 1, 0.8, 0], 
            rotate: [10, 90, 360, 720]
        }}
        transition={{ 
            duration: 0.9, 
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.5, 1]
        }}
        onAnimationComplete={() => {
          refreshCart()
          triggerCartBump()
          onComplete()
        }}
      >
        <img 
            src={image} 
            alt="flying-product" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default FlyingProduct
