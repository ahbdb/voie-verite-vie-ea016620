import {
  pgTable, text, boolean, integer, timestamp, uuid, jsonb, serial
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  full_name: text("full_name"),
  avatar_url: text("avatar_url"),
  birth_date: text("birth_date"),
  phone_country_code: text("phone_country_code"),
  phone_number: text("phone_number"),
  created_at: timestamp("created_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  role: text("role").notNull(),
});

export const biblicalReadings = pgTable("biblical_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull(),
  day_number: integer("day_number").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  books: text("books").notNull(),
  chapters: text("chapters").notNull(),
  chapters_count: integer("chapters_count").notNull(),
  type: text("type").notNull(),
  comment: text("comment"),
  created_at: timestamp("created_at").defaultNow(),
});

export const userReadingProgress = pgTable("user_reading_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  reading_id: uuid("reading_id").notNull(),
  completed: boolean("completed").default(false),
  completed_at: timestamp("completed_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const prayerRequests = pgTable("prayer_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  is_anonymous: boolean("is_anonymous").default(false),
  prayer_count: integer("prayer_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const prayerResponses = pgTable("prayer_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  prayer_request_id: uuid("prayer_request_id").notNull(),
  user_id: text("user_id"),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const faqItems = pgTable("faq_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"),
  sort_order: integer("sort_order"),
  is_published: boolean("is_published").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  image_url: text("image_url").notNull(),
  description: text("description"),
  category: text("category"),
  group_name: text("group_name"),
  sort_order: integer("sort_order"),
  is_published: boolean("is_published").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull(),
  max_participants: integer("max_participants").default(0),
  image_url: text("image_url"),
  price: text("price"),
  start_date: text("start_date"),
  end_date: text("end_date"),
  start_time: text("start_time"),
  end_time: text("end_time"),
  is_published: boolean("is_published").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const activityRegistrations = pgTable("activity_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  activity_name: text("activity_name").notNull(),
  phone_country_code: text("phone_country_code").notNull(),
  phone_number: text("phone_number").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const neuvaines = pgTable("neuvaines", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  saint_name: text("saint_name").notNull(),
  description: text("description"),
  introduction: text("introduction"),
  total_days: integer("total_days"),
  image_url: text("image_url"),
  pdf_url: text("pdf_url"),
  days: jsonb("days"),
  common_prayers: jsonb("common_prayers"),
  conclusion: jsonb("conclusion"),
  translations: jsonb("translations"),
  is_published: boolean("is_published").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const pageContent = pgTable("page_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  page_key: text("page_key").notNull().unique(),
  title: text("title"),
  subtitle: text("subtitle"),
  content: jsonb("content"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("announcement"),
  link: text("link"),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const fcmTokens = pgTable("fcm_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  token: text("token").notNull(),
  platform: text("platform"),
  device_info: text("device_info"),
  language: text("language"),
  timezone: text("timezone"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const scheduledSessions = pgTable("scheduled_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  session_type: text("session_type").notNull().default("audio"),
  scheduled_date: text("scheduled_date").notNull(),
  scheduled_time: text("scheduled_time").notNull(),
  estimated_duration: integer("estimated_duration"),
  access_type: text("access_type").notNull().default("public"),
  access_password: text("access_password"),
  recurrence: text("recurrence"),
  share_link: text("share_link"),
  status: text("status").notNull().default("scheduled"),
  tags: text("tags").array(),
  agenda: jsonb("agenda"),
  video_room_id: uuid("video_room_id"),
  recording_url: text("recording_url"),
  thumbnail_url: text("thumbnail_url"),
  viewer_count: integer("viewer_count"),
  platforms: jsonb("platforms"),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const sessionReminders = pgTable("session_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id").notNull(),
  user_id: text("user_id").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const videoRooms = pgTable("video_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  room_code: text("room_code"),
  is_active: boolean("is_active").default(true),
  created_by: text("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const videoRoomMessages = pgTable("video_room_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  room_id: uuid("room_id").notNull(),
  user_id: text("user_id").notNull(),
  display_name: text("display_name"),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const videoMessageReactions = pgTable("video_message_reactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  message_id: uuid("message_id").notNull(),
  room_id: uuid("room_id").notNull(),
  user_id: text("user_id").notNull(),
  emoji: text("emoji").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id"),
  title: text("title").default("Nouvelle conversation"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  reading_id: uuid("reading_id"),
  question: text("question").notNull(),
  question_type: text("question_type").notNull(),
  options: jsonb("options"),
  correct_answer: text("correct_answer"),
  difficulty: text("difficulty").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const userQuizResponses = pgTable("user_quiz_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").notNull(),
  quiz_id: uuid("quiz_id").notNull(),
  answer: text("answer").notNull(),
  is_correct: boolean("is_correct"),
  created_at: timestamp("created_at").defaultNow(),
});

export const activityReports = pgTable("activity_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  summary: text("summary"),
  report_date: text("report_date").notNull().default(""),
  period_start: text("period_start"),
  period_end: text("period_end"),
  content: jsonb("content"),
  cover_image_url: text("cover_image_url"),
  pdf_url: text("pdf_url"),
  sort_order: integer("sort_order"),
  is_published: boolean("is_published").default(true),
  linked_activities: text("linked_activities").array(),
  linked_galleries: text("linked_galleries").array(),
  linked_spiritual_practices: text("linked_spiritual_practices").array(),
  translations: jsonb("translations"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const donations = pgTable("donations", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id"),
  amount: integer("amount").notNull(),
  currency: text("currency"),
  donor_name: text("donor_name"),
  donor_email: text("donor_email"),
  message: text("message"),
  status: text("status"),
  created_at: timestamp("created_at").defaultNow(),
});

export const streamingSettings = pgTable("streaming_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtube_stream_key: text("youtube_stream_key"),
  facebook_stream_key: text("facebook_stream_key"),
  tiktok_stream_key: text("tiktok_stream_key"),
  tiktok_rtmp_url: text("tiktok_rtmp_url"),
  whatsapp_broadcast_link: text("whatsapp_broadcast_link"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const insertBiblicalReadingSchema = createInsertSchema(biblicalReadings);
export const insertPrayerRequestSchema = createInsertSchema(prayerRequests);
export const insertFaqItemSchema = createInsertSchema(faqItems);
export const insertActivitySchema = createInsertSchema(activities);
export const insertNeuvainerSchema = createInsertSchema(neuvaines);
export const insertPageContentSchema = createInsertSchema(pageContent);
export const insertContactMessageSchema = createInsertSchema(contactMessages);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertScheduledSessionSchema = createInsertSchema(scheduledSessions);
export const insertAiConversationSchema = createInsertSchema(aiConversations);
export const insertAiMessageSchema = createInsertSchema(aiMessages);

export type Profile = typeof profiles.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type BiblicalReading = typeof biblicalReadings.$inferSelect;
export type PrayerRequest = typeof prayerRequests.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Neuvaine = typeof neuvaines.$inferSelect;
export type PageContent = typeof pageContent.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ScheduledSession = typeof scheduledSessions.$inferSelect;
export type AiConversation = typeof aiConversations.$inferSelect;
export type AiMessage = typeof aiMessages.$inferSelect;
export type VideoRoom = typeof videoRooms.$inferSelect;
export type ActivityReport = typeof activityReports.$inferSelect;

// ─── Donation / bank account settings ─────────────────────────────────────
export const donationSettings = pgTable("donation_settings", {
  id: serial("id").primaryKey(),
  bank_name: text("bank_name").notNull(),
  bank_address: text("bank_address"),
  bic: text("bic").notNull(),
  iban: text("iban").notNull(),
  beneficiary_name: text("beneficiary_name").notNull(),
  beneficiary_title: text("beneficiary_title"),
  whatsapp_number: text("whatsapp_number"),
  active: boolean("active").default(true),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type DonationSettings = typeof donationSettings.$inferSelect;
