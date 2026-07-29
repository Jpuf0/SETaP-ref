CREATE TABLE `area_of_interest` (
	`id` text PRIMARY KEY,
	`staff_id` text NOT NULL,
	`label` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_area_of_interest_staff_id_user_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `expression_of_interest` (
	`id` text PRIMARY KEY,
	`student_id` text NOT NULL,
	`project_idea_id` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_expression_of_interest_student_id_user_id_fk` FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_expression_of_interest_project_idea_id_project_idea_id_fk` FOREIGN KEY (`project_idea_id`) REFERENCES `project_idea`(`id`) ON DELETE CASCADE,
	CONSTRAINT `expression_of_interest_student_idea_unique` UNIQUE(`student_id`,`project_idea_id`)
);
--> statement-breakpoint
CREATE TABLE `project_idea` (
	`id` text PRIMARY KEY,
	`staff_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_project_idea_staff_id_user_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `project_idea_interest` (
	`project_idea_id` text NOT NULL,
	`area_of_interest_id` text NOT NULL,
	CONSTRAINT `project_idea_interest_pk` PRIMARY KEY(`project_idea_id`, `area_of_interest_id`),
	CONSTRAINT `fk_project_idea_interest_project_idea_id_project_idea_id_fk` FOREIGN KEY (`project_idea_id`) REFERENCES `project_idea`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_project_idea_interest_area_of_interest_id_area_of_interest_id_fk` FOREIGN KEY (`area_of_interest_id`) REFERENCES `area_of_interest`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);