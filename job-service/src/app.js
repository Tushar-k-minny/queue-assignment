import cors from "cors"
import express from "express"
import helmet from "helmet"
import morgan from "morgan"

import JobRouter from "./jobs.routes.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import { getPublisher } from "./publisher.js"

const app = express()

app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan("dev"))



app.get("/healthz", (_, res) => {
    res.json({
        message: "🎉working fine"
    })
})


app.use("/jobs", JobRouter)

app.use(errorHandler)


const PORT = process.env.PORT || 5002
app.listen(PORT, async () => {
    console.log("Server is running on:", PORT)
    try {
        await getPublisher()
        console.log("✅ RabbitMQ initialized")
    } catch (err) {
        console.error("⚠️  Failed to connect to RabbitMQ:", err.message)
        console.error("⚠️  Server will continue, but job publishing will retry connections")
    }

})