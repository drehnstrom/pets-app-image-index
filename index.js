const vision = require('@google-cloud/vision');
const BigQuery = require('@google-cloud/bigquery');

const projectId = "doug-rehnstrom";
const datasetId = "pets_dataset";
const tableId = "pet_labels";

exports.imageindex = (data, context) => {
	const file = data;
	console.log('Processing file: ' + file.bucket + "/" + file.name);

	const client = new vision.ImageAnnotatorClient();
	const filepath = `gs://${file.bucket}/${file.name}`;
	const bigquery = new BigQuery({
		projectId: projectId
	});
	const rows = [];

	// Performs label detection on the gcs file
	client.labelDetection(filepath)
		.then((results) => {
			const labels = results[0].labelAnnotations;
			console.log("Labels found for " + file.name + JSON.stringify(labels));
			//const uuid = file.name.slice(0, -4);
			//console.log("UUID === " + uuid);
			labels.forEach((label) => {
				console.log("Label: " + label.description + ", Score: " + label.score);
				var row = {
					filename: file.name,
					label: label.description,
					score: label.score,
					pet_id: file.name.slice(0, -4)
				};
				rows.push(row);
			});

			bigquery
				.dataset(datasetId)
				.table(tableId)
				.insert(rows)
				.then(() => {
					console.log(`Inserted ${rows.length} rows`);
				}).catch(err => {
					if (err && err.name === 'PartialFailureError') {
						if (err.errors && err.errors.length > 0) {
							console.log('Insert errors:');
							err.errors.forEach(err => console.error(err));
						}
					} else {
						console.error('ERROR:', err);
					}
				});
		})
		.catch((err) => {
			console.error('ERROR:', err);
		});
};