import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import { requireStaffHook } from "../plugins/staffGuard";
const STORE_ID = "store_1";
export async function sopRoutes(app) {
    app.addHook("preHandler", requireStaffHook);
    // Get all templates with tasks
    app.get("/sop/templates", async () => {
        const templates = await app.prisma.sopTemplate.findMany({
            where: { storeId: STORE_ID, isActive: true },
            orderBy: { sort: "asc" },
            include: {
                tasks: {
                    orderBy: { sort: "asc" },
                },
            },
        });
        return templates;
    });
    // Create completion (with optional photo upload)
    app.post("/sop/completions", async (req, reply) => {
        try {
            const data = await req.file();
            if (!data) {
                reply.code(400);
                return { error: "NO_DATA" };
            }
            // Parse form fields
            const fields = {};
            // Get fields from multipart data
            const taskId = data.fields.taskId?.value;
            const templateId = data.fields.templateId?.value;
            const completedBy = data.fields.completedBy?.value;
            const note = data.fields.note?.value;
            if (!taskId || !templateId) {
                reply.code(400);
                return { error: "MISSING_REQUIRED_FIELDS" };
            }
            // Check if task exists and requires photo
            const task = await app.prisma.sopTask.findUnique({
                where: { id: taskId },
            });
            if (!task) {
                reply.code(404);
                return { error: "TASK_NOT_FOUND" };
            }
            let photoPath = null;
            // Handle photo upload if present
            if (data.file) {
                if (task.requiresPhoto || data.file) {
                    // Generate unique filename
                    const timestamp = Date.now();
                    const randomStr = randomBytes(8).toString("hex");
                    const ext = data.filename.split(".").pop() || "jpg";
                    const filename = `${timestamp}-${randomStr}.${ext}`;
                    const relativePath = `uploads/sop/${filename}`;
                    const absolutePath = join(process.cwd(), relativePath);
                    // Save file
                    await pipeline(data.file, createWriteStream(absolutePath));
                    photoPath = relativePath;
                }
            }
            else if (task.requiresPhoto) {
                reply.code(400);
                return { error: "PHOTO_REQUIRED" };
            }
            // Create completion record
            const completion = await app.prisma.sopCompletion.create({
                data: {
                    templateId,
                    taskId,
                    completedBy: completedBy?.trim() || null,
                    note: note?.trim() || null,
                    photoPath,
                },
                include: {
                    task: true,
                    template: true,
                },
            });
            return completion;
        }
        catch (error) {
            app.log.error(error);
            reply.code(500);
            return { error: "UPLOAD_FAILED", message: error.message };
        }
    });
    // Get completions with filters
    app.get("/sop/completions", async (req) => {
        const query = req.query;
        const limit = Math.min(parseInt(query.limit || "100"), 500);
        const where = {};
        if (query.templateId) {
            where.templateId = query.templateId;
        }
        if (query.startDate || query.endDate) {
            where.completedAt = {};
            if (query.startDate) {
                where.completedAt.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.completedAt.lte = new Date(query.endDate);
            }
        }
        const completions = await app.prisma.sopCompletion.findMany({
            where,
            orderBy: { completedAt: "desc" },
            take: limit,
            include: {
                task: true,
                template: true,
            },
        });
        return completions;
    });
}
