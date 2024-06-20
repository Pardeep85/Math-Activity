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

    return values;
}

function updateValues(roomData, ids) {
    // Function to generate a random value between 1 and 20
    function getRandomValue() {
        return 0;//Math.floor(Math.random() * 20) + 1;
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
        userData[socket.id] = { roomNo: roomNo, roomName: roomName, playerId: user }; // Store user-specific data
        // console.log(userData)

        // Initialize array for the room if it doesn't exist
        if (!roomDatas[roomNo]) {
            let roomData = generateNumberArray(20, 20);
            // console.log(roomData)
            let cellIds = generateUniqueRandomNumbers()
            console.log("Answer cells", cellIds);
            const result = findCellValues(roomData, cellIds);
            let operation = Math.floor(Math.random() * 4) + 1;

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
        io.to(socket.id).emit('enteredRoom', { roomNo: userData[socket.id].roomNo, roomName: roomName, playerId: user });
        io.emit("tableInfo", { roomData: roomDatas[userData[socket.id].roomNo] })
    });

    socket.on('message', (data) => {
        // console.log("meesage reciecved", Date)
        io.emit("message_result", { cell_id: data.cellId, user_id: userData[socket.id].playerId, roomNo: userData[socket.id].roomNo })
    });

    socket.on('get_winner', (data) => {
        // console.log("data.selected_cell_Id", data.selected_cell_Id)
        let updatedRoomData = updateValues(roomDatas[userData[socket.id].roomNo].roomData, data.selected_cell_Id)
        // console.log(updatedRoomData)
        let cellIds = generateUniqueRandomNumbers()
        console.log("Answer cells", cellIds);
        const result = findCellValues(updatedRoomData, cellIds);
        let operation = Math.floor(Math.random() * 4) + 1;

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
