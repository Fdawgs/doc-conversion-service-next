const { NotAcceptable, UnsupportedMediaType } = require("http-errors");
const fileType = require("file-type");

// Import plugins
const cors = require("fastify-cors");
const rtfToTxt = require("../../../plugins/rtf-to-txt");

const { rtfToTxtPostSchema } = require("./schema");

/**
 * @author Frazer Smith
 * @description Sets routing options for server.
 * @param {Function} server - Fastify instance.
 * @param {object} options - Route config values.
 * @param {object} options.cors - CORS settings.
 * @param {object} options.unrtf - RTF-to-TXT plugin settings.
 */
async function route(server, options) {
	if (options.bearerTokenAuthKeys) {
		rtfToTxtPostSchema.security = [{ bearerToken: [] }];
	}

	server.addHook("onRequest", async (req, res) => {
		if (
			// Catch unsupported Accept header media types
			!rtfToTxtPostSchema.produces.includes(
				req.accepts().type(rtfToTxtPostSchema.produces)
			)
		) {
			res.send(NotAcceptable());
		}
	});

	server.addContentTypeParser(
		"application/rtf",
		{ parseAs: "buffer" },
		async (req, payload) => {
			/**
			 * The Content-Type header can be spoofed so is not trusted implicitly,
			 * this checks for RTF specific magic numbers.
			 */
			const results = await fileType.fromBuffer(payload);
			if (
				results === undefined ||
				results.mime === undefined ||
				results.mime !== "application/rtf"
			) {
				throw UnsupportedMediaType();
			} else {
				return payload;
			}
		}
	);

	// Use CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
	server
		.register(cors, {
			...options.cors,
			methods: ["POST"],
			hideOptionsRoute: true,
		})
		.register(rtfToTxt, options.unrtf);

	server.route({
		method: "POST",
		url: "/",
		schema: rtfToTxtPostSchema,
		async handler(req, res) {
			res.send(req.conversionResults.body);
		},
	});
}

module.exports = route;
