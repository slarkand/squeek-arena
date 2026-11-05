module.exports = (req, res) => {
    // Enable CORS for external stream overlays & integrations
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const telemetry = {
        rpm: Math.round(175 + Math.sin(Date.now() * 0.003) * 55),
        total_revolutions: 14258 + Math.floor((Date.now() % 100000) / 10),
        power_watts: 14.8,
        miner_status: 'Mining',
        timestamp: Date.now()
    };

    res.status(200).json(telemetry);
};
