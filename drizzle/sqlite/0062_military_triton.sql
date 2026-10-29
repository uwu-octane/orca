CREATE TABLE `google_keyword_search_locations` (
	`search_id` text NOT NULL,
	`geo_target_id` text NOT NULL,
	PRIMARY KEY(`search_id`, `geo_target_id`),
	FOREIGN KEY (`search_id`) REFERENCES `google_keyword_searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_search_months` (
	`search_id` text NOT NULL,
	`row_position` integer NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`search_volume` integer NOT NULL,
	PRIMARY KEY(`search_id`, `row_position`, `year`, `month`),
	FOREIGN KEY (`search_id`,`row_position`) REFERENCES `google_keyword_search_rows`(`search_id`,`position`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_search_rows` (
	`search_id` text NOT NULL,
	`position` integer NOT NULL,
	`keyword` text NOT NULL,
	`search_volume` integer,
	`cpc` real,
	`competition` real,
	PRIMARY KEY(`search_id`, `position`),
	FOREIGN KEY (`search_id`) REFERENCES `google_keyword_searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_search_seeds` (
	`search_id` text NOT NULL,
	`position` integer NOT NULL,
	`keyword` text NOT NULL,
	PRIMARY KEY(`search_id`, `position`),
	FOREIGN KEY (`search_id`) REFERENCES `google_keyword_searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_search_variants` (
	`search_id` text NOT NULL,
	`row_position` integer NOT NULL,
	`keyword` text NOT NULL,
	PRIMARY KEY(`search_id`, `row_position`, `keyword`),
	FOREIGN KEY (`search_id`,`row_position`) REFERENCES `google_keyword_search_rows`(`search_id`,`position`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_keyword_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`language_id` text NOT NULL,
	`network` text NOT NULL,
	`include_adult_keywords` integer NOT NULL,
	`currency_code` text NOT NULL,
	`fetched_at` text NOT NULL,
	`page_size` integer NOT NULL,
	`page_token` text,
	`next_page_token` text,
	`dimension_revision` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `google_keyword_searches_project_fetched_idx` ON `google_keyword_searches` (`project_id`,`fetched_at`);--> statement-breakpoint
CREATE TABLE `keyword_research_dimensions` (
	`search_id` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`label_zh` text NOT NULL,
	PRIMARY KEY(`search_id`, `id`),
	FOREIGN KEY (`search_id`) REFERENCES `google_keyword_searches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `keyword_research_subdimensions` (
	`search_id` text NOT NULL,
	`dimension_id` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`label_zh` text NOT NULL,
	`active` integer NOT NULL,
	PRIMARY KEY(`search_id`, `id`),
	FOREIGN KEY (`search_id`,`dimension_id`) REFERENCES `keyword_research_dimensions`(`search_id`,`id`) ON UPDATE no action ON DELETE cascade
);
