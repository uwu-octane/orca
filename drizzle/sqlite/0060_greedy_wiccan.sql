CREATE TABLE `ai_provider_configs` (
	`project_id` text NOT NULL,
	`provider` text NOT NULL,
	`endpoint` text NOT NULL,
	`timeout_ms` integer NOT NULL,
	`encrypted_api_key` text,
	`revision` text NOT NULL,
	PRIMARY KEY(`project_id`, `provider`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
