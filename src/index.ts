import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';

// Importing JSON data
import data from './customers.json';

const app = express();

// Using express json middleware and cors middleware
// Making sure files can be uploaded safely
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Route to check api connection
app.get('/', (_: Request, res: Response) => {
    res.status(200).send('API working');
});

// Route to filter data based on search params
type QueryType = {
    first_name?: string;
    last_name?: string;
    city?: string;
    start?: number;
    end?: number;
};

type SearchParamType = {
    first_name?: string;
    last_name?: string;
    city?: string;
};

app.get('/search', (req: Request, res: Response) => {
    try {
        const queryParams = req.query as QueryType;
        const filteredData = Object.keys(queryParams)
                                .filter(param => !['start', 'end'].includes(param))   // removing pagination params
                                .reduce((customers, param) => (
                                    customers.filter(customer => (
                                        queryParams[param as keyof SearchParamType] === '' ||
                                        customer[param as keyof SearchParamType].toLowerCase().includes(queryParams[param as keyof SearchParamType]?.toLowerCase()!)
                                    ))
                                ), data);
        res.status(200).json({ data: filteredData.slice(queryParams.start, queryParams.end), length: filteredData.length });
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
});

// Route to get customer by id
app.get('/customers/:id', (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const customer = data.filter(customer => customer.id === +id)[0] ?? null;
    
        if (customer !== null) {
            res.status(200).json({ data: customer });
        } else {
            res.status(404).json({ message: `Customer with id ${id} not found...` });
        }
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
});

// Route to get cities with number of customers
app.get('/cities', (_: Request, res: Response) => {
    try {
        const cityToCountMap = new Map<string, number>();
        
        for (let customer of data) {
            cityToCountMap.set(customer.city, (cityToCountMap.get(customer.city) ?? 0) + 1);
        }
        
        res.status(200).json({ data: Array.from(cityToCountMap).map(it => ({ name: it[0], count: it[1] })) });
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
});

// File upload route
type FileBodyType = {
    file: string;
    fileType: string;
};

app.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body as FileBodyType;
        const folder = 'public';
        const fileName = 'temp';
        const ext = body.fileType.split('/')[1];
    
        // checking if folder exists
        await new Promise(resolve => {
            fs
                .access(folder)
                .then(resolve)
                .catch(() => {
                    fs.mkdir(folder);
                    resolve(true);
                });
        });
    
        await fs.writeFile(`${folder}/${fileName}.${ext}`, Buffer.from(body.file, 'base64'));
    
        res.status(200).json({ message: 'File uploaded successfully' });
    } catch (err) {
        res.status(500).json({ message: (err as Error).message });
    }
});

// Listening to server
app.listen(4000, () => console.log('Server running...'));
