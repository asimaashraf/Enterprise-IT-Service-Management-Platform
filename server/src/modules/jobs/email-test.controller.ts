import { Request, Response } from "express";

import { emailQueue } from "../../jobs/queues/email.queue";

// ==========================================
// TEST EMAIL JOB
// ==========================================

export const testEmailJob = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      to,
      subject,
      text,
      html,
    } = req.body;

    // ======================================
    // VALIDATION
    // ======================================

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message:
          "to and subject are required",
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        success: false,
        message:
          "Either text or html is required",
      });
    }

    // ======================================
    // ADD EMAIL JOB
    // ======================================

    const job = await emailQueue.add(
      "send-email",
      {
        to,
        subject,
        text,
        html,
      }
    );

    // ======================================
    // SAFETY CHECK
    // ======================================

    if (!job) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to create email job",
      });
    }

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(201).json({
      success: true,
      message:
        "Email job added successfully",
      jobId: job.id,
    });
  } catch (error) {
    console.error(
      "Email test job error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add email job",
    });
  }
};