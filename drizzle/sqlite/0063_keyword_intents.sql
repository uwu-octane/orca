CREATE TABLE `google_keyword_search_intents` (
	`search_id` text NOT NULL,
	`row_position` integer NOT NULL,
	`intent` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`decided_at` text NOT NULL,
	PRIMARY KEY(`search_id`, `row_position`),
	FOREIGN KEY (`search_id`,`row_position`) REFERENCES `google_keyword_search_rows`(`search_id`,`position`) ON UPDATE no action ON DELETE cascade
);
