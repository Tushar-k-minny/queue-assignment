import cors from "cors"
import express from "express"
import helmet from "helmet"
import morgan from "morgan"
import AuthRouter from "./auth.routes.js"
import { errorHandler } from "./middlewares/errorHandler.js"

const app = express()

app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan("dev"))

app.use("/auth", AuthRouter)

app.get("/healthz", (req, res) => {
    res.json({
        message: "working fine"
    })
})


app.use(errorHandler)


const PORT = process.env.PORT || 5001
app.listen(PORT, () => {
    console.log("Server is running on:", PORT)
})