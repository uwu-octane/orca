CREATE TABLE `google_keyword_close_variants` (
	`metric_id` text NOT NULL,
	`keyword` text NOT NULL,
	PRIMARY KEY(`metric_id`, `keyword`),
	FOREIGN KEY (`metric_id`) REFERENCES `google_keyword_metrics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`keyword` text NOT NULL,
	`search_volume` integer,
	`cpc` real,
	`competition` real,
	`fetched_at` text NOT NULL,
	FOREIGN KEY (`scope_id`) REFERENCES `google_keyword_scopes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_keyword_metrics_scope_keyword_idx` ON `google_keyword_metrics` (`scope_id`,`keyword`);--> statement-breakpoint
CREATE TABLE `google_keyword_monthly_volumes` (
	`metric_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`search_volume` integer NOT NULL,
	PRIMARY KEY(`metric_id`, `year`, `month`),
	FOREIGN KEY (`metric_id`) REFERENCES `google_keyword_metrics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_scope_locations` (
	`scope_id` text NOT NULL,
	`geo_target_id` text NOT NULL,
	PRIMARY KEY(`scope_id`, `geo_target_id`),
	FOREIGN KEY (`scope_id`) REFERENCES `google_keyword_scopes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`language_id` text NOT NULL,
	`network` text NOT NULL,
	`include_adult_keywords` integer NOT NULL,
	`currency_code` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `google_keyword_scopes_project_customer_idx` ON `google_keyword_scopes` (`project_id`,`customer_id`);