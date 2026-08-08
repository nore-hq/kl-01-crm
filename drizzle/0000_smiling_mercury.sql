CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`is_late` integer DEFAULT false NOT NULL,
	`overtime_hours` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`phone` text NOT NULL,
	`position` text NOT NULL,
	`daily_salary` real NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `salary_advances` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`amount` real NOT NULL,
	`date_paid` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
