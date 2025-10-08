export interface Job {
	id: string;
	title: string;
	description: string;
	status: "QUEUED" | "INPROGRESS" | "COMPLETED" | "FAILED";
	result?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProcessedJob extends Job {
	result: string;
}

export interface ErrorResponse {
	message: string;
	stack?: string;
}
