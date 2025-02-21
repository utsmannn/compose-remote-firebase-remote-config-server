const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const remoteConfig = admin.remoteConfig();

app.get('/remote-config/parameter', async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) {
            return res.status(400).json({ error: 'Key parameter is required in query' });
        }

        const template = await remoteConfig.getTemplate();
        const parameter = template.parameters[key];

        if (!parameter) {
            return res.status(404).json({
                error: `Parameter with key '${key}' not found`
            });
        }

        // If parameter is JSON type, parse the value
        let value = parameter.defaultValue.value;
        try {
            value = JSON.parse(value);
        } catch (e) {
            // If parsing fails, return the raw value
        }

        res.json({
            key: key,
            value: value,
            description: parameter.description,
            valueType: parameter.valueType
        });
    } catch (error) {
        console.error('Error getting parameter:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/remote-config/parameter', async (req, res) => {
    try {
        const key = req.query.key;
        if (!key) {
            return res.status(400).json({ error: 'Key parameter is required in query' });
        }

        const jsonValue = req.body;

        const template = await remoteConfig.getTemplate();

        template.parameters[key] = {
            defaultValue: {
                value: JSON.stringify(jsonValue)
            },
            description: `JSON value for ${key}`,
            valueType: 'JSON'
        };

        const validatedTemplate = await remoteConfig.validateTemplate(template);
        await remoteConfig.publishTemplate(validatedTemplate);

        res.json({
            message: 'Parameter updated successfully',
            key: key,
            value: jsonValue
        });
    } catch (error) {
        console.error('Error updating parameter:', error);
        res.status(500).json({ error: error.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});