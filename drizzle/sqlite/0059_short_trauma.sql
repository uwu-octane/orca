CREATE TABLE `keyword_generation_configs` (
	`project_id` text PRIMARY KEY NOT NULL,
	`model` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`revision` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
