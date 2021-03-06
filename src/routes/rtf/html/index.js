const { NotAcceptable, UnsupportedMediaType } = require("http-errors");
const fileType = require("file-type");

// Import plugins
const cors = require("fastify-cors");
const rtfToHtml = require("../../../plugins/rtf-to-html");

const { rtfToHtmlPostSchema } = require("./schema");

/**
 * @author Frazer Smith
 * @description Sets routing options for server.
 * @param {Function} server - Fastify instance.
 * @param {object} options - Route config values.
 * @param {object} options.cors - CORS settings.
 * @param {object} options.unrtf - RTF-to-HTML plugin settings.
 */
async function route(server, options) {
	if (options.bearerTokenAuthKeys) {
		rtfToHtmlPostSchema.security = [{ bearerToken: [] }];
	}

	server.addHook("onRequest", async (req, res) => {
		if (
			// Catch unsupported Accept header media types
			!rtfToHtmlPostSchema.produces.includes(
				req.accepts().type(rtfToHtmlPostSchema.produces)
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
		.register(rtfToHtml, options.unrtf);

	server.route({
		method: "POST",
		url: "/",
		schema: rtfToHtmlPostSchema,
		async handler(req, res) {
			const result = server.tidyCss(
				await server.tidyHtml(
					server.embedHtmlImages(
						req.conversionResults.body,
						req.query.removeAlt
					)
				),
				{
					fonts: req.query.fonts,
					backgroundColor: req.query.backgroundColor,
				}
			);

			res.send(result);
		},
	});
}

module.exports = route;
