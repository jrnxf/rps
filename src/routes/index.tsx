import { createFileRoute } from '@tanstack/react-router'
import React, { useEffect, useRef, useState } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'

export const Route = createFileRoute('/')({
  component: RpsGame,
})

const ENTITY_COUNT_PER_TYPE = 30
const ENTITY_SIZE = 30

const EMOJIS = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
}

const TYPES = ['rock', 'paper', 'scissors'] as const

type EntityType = (typeof TYPES)[number]

type Entity = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  type: EntityType
}

function createEntities(width: number, height: number): Array<Entity> {
  const newEntities: Array<Entity> = []
  let id = 0
  for (const type of TYPES) {
    for (let i = 0; i < ENTITY_COUNT_PER_TYPE; i++) {
      newEntities.push({
        id: id++,
        x: Math.random() * (width - ENTITY_SIZE) + ENTITY_SIZE / 2,
        y: Math.random() * (height - ENTITY_SIZE) + ENTITY_SIZE / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        type: type,
      })
    }
  }
  return newEntities
}

function RpsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width, height } = useWindowSize()

  const statsContainerWidth = 260 // approx width of stats container + gap
  const canvasWidth = width - statsContainerWidth
  const canvasHeight = height

  const entitiesRef = useRef<Array<Entity>>(
    createEntities(canvasWidth, canvasHeight),
  )
  const [speed, setSpeed] = useState(1)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const [roundWinner, setRoundWinner] = useState<EntityType | null>(null)
  const [counts, setCounts] = useState({ rock: 0, paper: 0, scissors: 0 })
  const [roundScores, setRoundScores] = useState({
    rock: 0,
    paper: 0,
    scissors: 0,
  })
  const [ultimateWinner, setUltimateWinner] = useState<EntityType | null>(null)

  const startNextRound = () => {
    setRoundWinner(null)
    entitiesRef.current = createEntities(canvasWidth, canvasHeight)
  }

  const fullReset = () => {
    startNextRound()
    setRoundScores({ rock: 0, paper: 0, scissors: 0 })
    setUltimateWinner(null)
  }

  useEffect(() => {
    fullReset()
  }, [canvasWidth, canvasHeight])

  useEffect(() => {
    if (roundWinner) {
      const newScores = { ...roundScores }
      newScores[roundWinner]++
      setRoundScores(newScores)

      if (newScores[roundWinner] >= 4) {
        setUltimateWinner(roundWinner)
      } else {
        const timer = setTimeout(() => {
          startNextRound()
        }, 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [roundWinner])

  useEffect(() => {
    const gameLoop = () => {
      if (roundWinner || ultimateWinner) {
        return
      }

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      const entities = entitiesRef.current

      const newCounts = { rock: 0, paper: 0, scissors: 0 }
      entities.forEach((entity) => {
        newCounts[entity.type]++
      })
      setCounts(newCounts)

      const winnerCheck = Object.keys(newCounts).find(
        (type) =>
          newCounts[type as EntityType] ===
          newCounts.rock + newCounts.paper + newCounts.scissors,
      ) as EntityType | undefined

      if (
        winnerCheck &&
        newCounts.rock + newCounts.paper + newCounts.scissors > 0
      ) {
        setRoundWinner(winnerCheck)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${ENTITY_SIZE}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const activeTypes = Object.values(newCounts).filter(
        (count) => count > 0,
      ).length
      const effectiveSpeed = activeTypes === 2 ? 0.2 : speedRef.current

      for (const entity of entities) {
        entity.x += entity.vx * effectiveSpeed
        entity.y += entity.vy * effectiveSpeed

        if (
          entity.x <= ENTITY_SIZE / 2 ||
          entity.x >= canvas.width - ENTITY_SIZE / 2
        ) {
          entity.vx *= -1
          entity.x = Math.max(
            ENTITY_SIZE / 2,
            Math.min(entity.x, canvas.width - ENTITY_SIZE / 2),
          )
        }
        if (
          entity.y <= ENTITY_SIZE / 2 ||
          entity.y >= canvas.height - ENTITY_SIZE / 2
        ) {
          entity.vy *= -1
          entity.y = Math.max(
            ENTITY_SIZE / 2,
            Math.min(entity.y, canvas.height - ENTITY_SIZE / 2),
          )
        }

        ctx.fillText(EMOJIS[entity.type], entity.x, entity.y)
      }

      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const e1 = entities[i]
          const e2 = entities[j]

          const dx = e1.x - e2.x
          const dy = e1.y - e2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < ENTITY_SIZE) {
            // Collision
            const collisionWinner = getWinner(e1.type, e2.type)
            if (collisionWinner) {
              if (collisionWinner === e1.type) {
                e2.type = e1.type
              } else {
                e1.type = e2.type
              }
            }

            // Elastic collision response
            const tempVx = e1.vx
            const tempVy = e1.vy
            e1.vx = e2.vx
            e1.vy = e2.vy
            e2.vx = tempVx
            e2.vy = tempVy
          }
        }
      }

      requestAnimationFrame(gameLoop)
    }

    const animationFrameId = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [roundWinner, ultimateWinner])

  useEffect(() => {
    let animationFrameId: number
    if (ultimateWinner) {
      const winnerEntities = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        type: ultimateWinner,
      }))

      const ultimateWinnerAnimationLoop = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = `${ENTITY_SIZE}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        for (const entity of winnerEntities) {
          entity.x += entity.vx
          entity.y += entity.vy
          ctx.fillText(EMOJIS[entity.type], entity.x, entity.y)
        }

        animationFrameId = requestAnimationFrame(ultimateWinnerAnimationLoop)
      }
      ultimateWinnerAnimationLoop()
    }
    return () => cancelAnimationFrame(animationFrameId)
  }, [ultimateWinner, canvasWidth, canvasHeight])

  const getWinner = (
    type1: EntityType,
    type2: EntityType,
  ): EntityType | null => {
    if (type1 === type2) return null
    if (
      (type1 === 'rock' && type2 === 'scissors') ||
      (type1 === 'scissors' && type2 === 'paper') ||
      (type1 === 'paper' && type2 === 'rock')
    ) {
      return type1
    }
    return type2
  }

  return (
    <div className="game-wrapper">
      {roundWinner && !ultimateWinner && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={500}
          gravity={0.3}
          recycle={false}
        />
      )}
      <div className="main-game-area">
        {(() => {
          if (ultimateWinner) {
            return (
              <div className="game-over">
                <h1>SERIES COMPLETE!</h1>
                <h2>
                  {EMOJIS[ultimateWinner]} {ultimateWinner} wins the best of 7!
                </h2>
                <button onClick={fullReset}>Play Again</button>
              </div>
            )
          }

          if (roundWinner) {
            return (
              <div className="game-over">
                <h1>Round Over!</h1>
                <p>
                  The winner is {EMOJIS[roundWinner]} {roundWinner}!
                </p>
                <p className="next-round-timer">Starting next round soon...</p>
              </div>
            )
          }

          return (
            <>
              <h1>Rock Paper Scissors Simulation</h1>
              <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="game-canvas"
              />
              <div className="controls">
                <button onClick={fullReset}>Reset Game</button>
                <label>
                  Speed:
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                  />
                </label>
              </div>
            </>
          )
        })()}
      </div>
      <div className="stats-container">
        <h2>Round Scores</h2>
        <p>
          🪨 Rock: <span>{roundScores.rock}</span>
        </p>
        <p>
          📄 Paper: <span>{roundScores.paper}</span>
        </p>
        <p>
          ✂️ Scissors: <span>{roundScores.scissors}</span>
        </p>
        <hr />
        <h2>Live Counts</h2>
        <p>
          🪨 Rock: <span>{counts.rock}</span>
        </p>
        <p>
          📄 Paper: <span>{counts.paper}</span>
        </p>
        <p>
          ✂️ Scissors: <span>{counts.scissors}</span>
        </p>
      </div>
    </div>
  )
}
