const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile("/public/index.html");
});

var roomNo = 1;
var user = 0;
const userData = {};
var roomAvaiableSeats = {};
const roomDatas = {};
var maxValue = 20;

function createSequentialArray(rows, cols) {
    const array = [];
    let currentValue = 1;

    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            row.push(currentValue);
            currentValue++;
        }
        array.push(row);
    }

    return array;
}


function getConnectedElements(array) {
    const directions = [
        [0, 1],  // Right
        [1, 0],  // Down
        [1, 1],  // Diagonal Right Down
        [1, -1], // Diagonal Left Down
        [0, -1], // Left
        [-1, 0], // Up
        [-1, -1],// Diagonal Left Up
        [-1, 1]  // Diagonal Right Up
    ];
    const rows = array.length;
    const cols = array[0].length;
    let mainElement, connectedElements;

    while (!connectedElements) {
        // Randomly choose a main element
        const mainRow = Math.floor(Math.random() * rows);
        const mainCol = Math.floor(Math.random() * cols);
        mainElement = array[mainRow][mainCol];

        // Shuffle directions to ensure randomness in selection
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        for (let [rowDir, colDir] of directions) {
            const positions = [[mainRow, mainCol]];

            for (let i = 1; i <= 2; i++) {  // We need 2 more connected elements
                const newRow = mainRow + i * rowDir;
                const newCol = mainCol + i * colDir;

                // Check if the new position is within bounds
                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
                    positions.push([newRow, newCol]);
                } else {
                    break;
                }
            }

            if (positions.length === 3) {
                connectedElements = positions;
                break;
            }
        }
    }

    // Extract the values based on the positions
    const elements = connectedElements.map(([row, col]) => array[row][col]);

    return elements;
}

function generateUniqueRandomNumbers() {
    let numbers = new Set();

    while (numbers.size < 3) {
        let randomNumber = Math.floor(Math.random() * 400) + 1;
        numbers.add(randomNumber);
    }

    return Array.from(numbers);
}

function generateNumberArray(rows, columns) {
    const results = [];
    let count = 1
    for (let j = 0; j < rows; j++) {
        const result = [];
        for (let i = 0; i < columns; i++) {
            let value = Math.floor(Math.random() * 9) + 1;
            result.push({ id: count, value });
            count++;
        }
        results.push(result)
    }
    return results;
}

function findCellValues(roomData, cellIDs) {
    let values = [];

    cellIDs.forEach(cellID => {
        for (let row of roomData) {
            for (let cell of row) {
                if (cell.id === cellID) {
                    values.push(cell.value);
                    break;
                }
            }
        }
    });
    console.log("findCellValues", values)
    return values;
}

function updateValues(roomData, ids) {
    // Function to generate a random value between 1 and 20
    function getRandomValue() {
        return Math.floor(Math.random() * 8) + 1;
    }

    // Iterate through each room array in roomData
    for (let i = 0; i < roomData.length; i++) {
        // Iterate through each object in the room array
        for (let j = 0; j < roomData[i].length; j++) {
            // If the current object's id is in the ids array, update its value
            if (ids.includes(roomData[i][j].id)) {
                roomData[i][j].value = getRandomValue();
            }
        }
    }

    return roomData;
}

function sumOfNumbers(numbers) {
    return numbers.reduce((sum, number) => sum + number, 0);
}

function productOfNumbers(numbers) {
    return numbers.reduce((product, number) => product * number, 1);
}

function differenceOfNumbers(numbers) {
    if (numbers.length === 0) return 0; // Handle empty array
    if (numbers.length === 1) return numbers[0]; // Handle single element array

    numbers.sort((a, b) => a - b); // Sort the array in ascending order
    let difference = numbers[0]; // Start with the first number
    for (let i = 1; i < numbers.length; i++) {
        difference = Math.abs(difference - numbers[i]);
        // console.log(i, difference)
    }

    return difference;
}

function divisionOfNumbers(numbers) {
    if (numbers.length === 0) return 0; // Handle empty array
    if (numbers.length === 1) return numbers[0]; // Handle single element array

    let result = numbers[0]; // Start with the first number
    let r = [...numbers]
    for (let i = 0; i < numbers.length - 1; i++) {
        if (r.length > 1) {
            r.sort((a, b) => b - a);
            result = r[0] / r[1];
            r = r.slice(2)
            r.push(result)
        }

    }

    return Math.trunc(Math.abs(result)); // Return the absolute value to ensure positivity
}

io.on('connection', (socket) => {
    console.log('A user connected with socket id = ', socket.id);
    // Joining a room
    socket.on('joinRoom', () => {
        if (user == 2) {
            roomNo++;
            user = 0;
        }
        let roomName = `Room-${roomNo}`;
        roomAvaiableSeats[roomNo] = user++;
        userData[socket.id] = { roomNo: roomNo, roomName: roomName, playerId: user, point: 0 }; // Store user-specific data
        // console.log(userData)

        // Initialize array for the room if it doesn't exist
        if (!roomDatas[roomNo]) {
            let roomData = generateNumberArray(20, 20);
            // console.log(roomData)
            const array = createSequentialArray(20, 20);
            let cellIds = getConnectedElements(array);
            // let cellIds = generateUniqueRandomNumbers()
            console.log("Answer cellsdddddddd", cellIds);
            const result = findCellValues(roomData, cellIds);
            let operation = 1;//Math.floor(Math.random() * 4) + 1;

            if (operation == 4) {
                roomDatas[roomNo] = { roomData: roomData, target: divisionOfNumbers(result), operation: "Division" };
            }
            else if (operation == 3) {
                roomDatas[roomNo] = { roomData: roomData, target: productOfNumbers(result), operation: "Multiplication" };
            }
            else if (operation == 2) {
                roomDatas[roomNo] = { roomData: roomData, target: differenceOfNumbers(result), operation: "Substraction" };
            }
            else {
                roomDatas[roomNo] = { roomData: roomData, target: sumOfNumbers(result), operation: "Addition" };
            }


        }
        // console.log(`User ${socket.id} joined room: ${roomName}`);

        // Notify the user has joined the room with their specific roomNo
        io.to(socket.id).emit('enteredRoom', { roomNo: userData[socket.id].roomNo, roomName: roomName, playerId: user, point: 0 });
        io.emit("tableInfo", { roomData: roomDatas[userData[socket.id].roomNo] })
    });

    socket.on('message', (data) => {
        // console.log("meesage reciecved", Date)
        io.emit("message_result", { cell_id: data.cellId, user_id: userData[socket.id].playerId, roomNo: userData[socket.id].roomNo, point: userData[socket.id].point })
    });

    socket.on('get_winner', (data) => {
        // console.log("data.selected_cell_Id", data.selected_cell_Id)
        let updatedRoomData = updateValues(roomDatas[userData[socket.id].roomNo].roomData, data.selected_cell_Id)
        const array = createSequentialArray(20, 20);
        let cellIds = getConnectedElements(array);
        userData[socket.id].point = Number(userData[socket.id].point) + Number(data.currentPoint)
        console.log("Answer celkjjls", cellIds);
        const result = findCellValues(updatedRoomData, cellIds);
        let operation = 1;

        if (operation == 4) {
            roomDatas[roomNo] = { roomData: updatedRoomData, target: divisionOfNumbers(result), operation: "Division" };
        }
        else if (operation == 3) {
            roomDatas[roomNo] = { roomData: updatedRoomData, target: productOfNumbers(result), operation: "Multiplication" };
        }
        else if (operation == 2) {
            roomDatas[roomNo] = { roomData: updatedRoomData, target: differenceOfNumbers(result), operation: "Substraction" };
        }
        else {
            roomDatas[roomNo] = { roomData: updatedRoomData, target: sumOfNumbers(result), operation: "Addition" };
        }
        // roomDatas[roomNo] = { roomData: updatedRoomData, target: sumOfNumbers(result) + maxValue };
        setTimeout(() => {
            io.emit("tableInfo", { roomData: roomDatas[userData[socket.id].roomNo] })
        }, 500)
    })

    // Leaving the room
    socket.on('leaveRoom', (roomName) => {
        socket.leave(roomName);
        // console.log(`User ${socket.id} left room: ${roomName}`);

        // Notify the room that the user has left
        io.to(roomName).emit('message', `User ${socket.id} has left the room.`);
    });


    // socket.on('disconnect', () => {
    //     delete userData[socket.id]; // Clean up user data on disconnect
    //     console.log(`User ${socket.id} disconnected`);
    // });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
